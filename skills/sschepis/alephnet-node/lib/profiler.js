/**
 * Performance Profiler for Oscillator Dynamics
 *
 * Provides detailed performance monitoring for the PRSC engine:
 * - Tick cycle timing and throughput
 * - Oscillator phase computation
 * - SMF operations performance
 * - Memory usage tracking
 * - CPU time analysis
 * - Bottleneck detection
 */

const { EventEmitter } = require('events')
const { performance, PerformanceObserver } = require('perf_hooks')

// ============================================================================
// METRIC TYPES
// ============================================================================

const MetricType = {
  COUNTER: 'counter', // Monotonically increasing value
  GAUGE: 'gauge', // Value that goes up and down
  HISTOGRAM: 'histogram', // Distribution of values
  SUMMARY: 'summary', // Statistical summary
  TIMER: 'timer', // Duration measurements
}

// ============================================================================
// HISTOGRAM BUCKETS
// ============================================================================

/**
 * Default histogram buckets for different metric categories
 */
const HISTOGRAM_BUCKETS = {
  // Tick duration buckets (ms)
  tick: [0.1, 0.5, 1, 2, 5, 10, 25, 50, 100, 250, 500, 1000],

  // Phase computation buckets (ms)
  phase: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],

  // SMF operation buckets (ms)
  smf: [0.01, 0.05, 0.1, 0.5, 1, 5, 10, 50],

  // Memory operation buckets (ms)
  memory: [0.1, 0.5, 1, 5, 10, 50, 100, 500],
}

// ============================================================================
// RING BUFFER FOR SAMPLES
// ============================================================================

/**
 * Fixed-size ring buffer for storing samples
 */
class RingBuffer {
  constructor(capacity = 1000) {
    this.capacity = capacity
    this.buffer = new Float64Array(capacity)
    this.head = 0
    this.size = 0
  }

  push(value) {
    this.buffer[this.head] = value
    this.head = (this.head + 1) % this.capacity
    if (this.size < this.capacity) this.size++
  }

  getAll() {
    if (this.size < this.capacity) {
      return Array.from(this.buffer.subarray(0, this.size))
    }
    // Return in order from oldest to newest
    const result = []
    for (let i = 0; i < this.size; i++) {
      result.push(this.buffer[(this.head + i) % this.capacity])
    }
    return result
  }

  getLatest(n = 100) {
    const values = this.getAll()
    return values.slice(-n)
  }

  clear() {
    this.head = 0
    this.size = 0
  }
}

// ============================================================================
// HISTOGRAM
// ============================================================================

/**
 * Histogram for tracking value distributions
 */
class Histogram {
  constructor(buckets = HISTOGRAM_BUCKETS.tick) {
    this.buckets = [...buckets].sort((a, b) => a - b)
    this.counts = new Map()
    this.sum = 0
    this.count = 0
    this.min = Infinity
    this.max = -Infinity

    // Initialize bucket counts
    for (const bucket of this.buckets) {
      this.counts.set(bucket, 0)
    }
    this.counts.set(Infinity, 0) // +Inf bucket
  }

  observe(value) {
    this.sum += value
    this.count++
    this.min = Math.min(this.min, value)
    this.max = Math.max(this.max, value)

    // Increment appropriate bucket
    let found = false
    for (const bucket of this.buckets) {
      if (value <= bucket) {
        this.counts.set(bucket, this.counts.get(bucket) + 1)
        found = true
        break
      }
    }
    if (!found) {
      this.counts.set(Infinity, this.counts.get(Infinity) + 1)
    }
  }

  getPercentile(p) {
    if (this.count === 0) return 0

    const target = Math.ceil((p / 100) * this.count)
    let cumulative = 0

    for (const bucket of this.buckets) {
      cumulative += this.counts.get(bucket)
      if (cumulative >= target) {
        return bucket
      }
    }

    return this.max
  }

  getMean() {
    return this.count > 0 ? this.sum / this.count : 0
  }

  getStats() {
    return {
      count: this.count,
      sum: this.sum,
      min: this.min === Infinity ? 0 : this.min,
      max: this.max === -Infinity ? 0 : this.max,
      mean: this.getMean(),
      p50: this.getPercentile(50),
      p90: this.getPercentile(90),
      p99: this.getPercentile(99),
    }
  }

  reset() {
    this.sum = 0
    this.count = 0
    this.min = Infinity
    this.max = -Infinity
    for (const bucket of this.counts.keys()) {
      this.counts.set(bucket, 0)
    }
  }
}

// ============================================================================
// TIMER
// ============================================================================

/**
 * Timer for measuring durations
 */
class Timer {
  constructor(name, buckets) {
    this.name = name
    this.histogram = new Histogram(buckets)
    this.samples = new RingBuffer(1000)
    this.activeTimers = new Map()
  }

  start(label = 'default') {
    this.activeTimers.set(label, performance.now())
    return label
  }

  stop(label = 'default') {
    const startTime = this.activeTimers.get(label)
    if (startTime === undefined) {
      throw new Error(`Timer ${label} was not started`)
    }

    const duration = performance.now() - startTime
    this.activeTimers.delete(label)

    this.histogram.observe(duration)
    this.samples.push(duration)

    return duration
  }

  time(fn, label = 'default') {
    this.start(label)
    try {
      return fn()
    } finally {
      this.stop(label)
    }
  }

  async timeAsync(fn, label = 'default') {
    this.start(label)
    try {
      return await fn()
    } finally {
      this.stop(label)
    }
  }

  getStats() {
    return this.histogram.getStats()
  }

  getRecentSamples(n = 100) {
    return this.samples.getLatest(n)
  }

  reset() {
    this.histogram.reset()
    this.samples.clear()
    this.activeTimers.clear()
  }
}

// ============================================================================
// OSCILLATOR PROFILER
// ============================================================================

/**
 * Specialized profiler for oscillator dynamics
 */
class OscillatorProfiler extends EventEmitter {
  constructor(options = {}) {
    super()

    this.enabled = options.enabled ?? true
    this.sampleWindow = options.sampleWindow || 1000 // Last N samples

    // Core timers
    this.timers = {
      // Main tick cycle
      tick: new Timer('tick', HISTOGRAM_BUCKETS.tick),

      // Tick components
      phaseCompute: new Timer('phase_compute', HISTOGRAM_BUCKETS.phase),
      kuramotoStep: new Timer('kuramoto_step', HISTOGRAM_BUCKETS.phase),
      thermalDynamics: new Timer('thermal_dynamics', HISTOGRAM_BUCKETS.phase),

      // SMF operations
      smfUpdate: new Timer('smf_update', HISTOGRAM_BUCKETS.smf),
      smfRotate: new Timer('smf_rotate', HISTOGRAM_BUCKETS.smf),
      smfNormalize: new Timer('smf_normalize', HISTOGRAM_BUCKETS.smf),
      codebookTunnel: new Timer('codebook_tunnel', HISTOGRAM_BUCKETS.smf),

      // Memory operations
      memoryStore: new Timer('memory_store', HISTOGRAM_BUCKETS.memory),
      memoryRetrieve: new Timer('memory_retrieve', HISTOGRAM_BUCKETS.memory),
      memorySave: new Timer('memory_save', HISTOGRAM_BUCKETS.memory),
      memoryLoad: new Timer('memory_load', HISTOGRAM_BUCKETS.memory),
    }

    // Counters
    this.counters = {
      ticks: 0,
      coherentTicks: 0,
      thermalEvents: 0,
      codebookTunnels: 0,
      memoryStores: 0,
      memoryRetrieves: 0,
      phaseWraps: 0,
    }

    // Gauges (current values)
    this.gauges = {
      coherence: 0,
      entropy: 0,
      temperature: 0,
      orderParameter: 0,
      activeOscillators: 0,
      memorySize: 0,
      heapUsed: 0,
      heapTotal: 0,
    }

    // History for trend analysis
    this.coherenceHistory = new RingBuffer(this.sampleWindow)
    this.entropyHistory = new RingBuffer(this.sampleWindow)
    this.tickRateHistory = new RingBuffer(100)

    // Performance tracking
    this.lastTickTime = 0
    this.ticksThisSecond = 0
    this.currentTickRate = 0
    this.lastSecondStart = Date.now()

    // Bottleneck detection
    this.bottleneckThresholds = {
      tick: 50, // ms - warn if tick > 50ms
      phaseCompute: 10, // ms
      smfUpdate: 5, // ms
    }

    this.bottleneckEvents = []
    this.maxBottleneckEvents = 100

    // Start memory monitoring
    if (options.monitorMemory ?? true) {
      this.startMemoryMonitoring()
    }
  }

  // ========================================================================
  // TIMING METHODS
  // ========================================================================

  /**
   * Start timing a tick cycle
   */
  startTick() {
    if (!this.enabled) return

    const now = Date.now()

    // Calculate tick rate
    if (now - this.lastSecondStart >= 1000) {
      this.currentTickRate = this.ticksThisSecond
      this.tickRateHistory.push(this.currentTickRate)
      this.ticksThisSecond = 0
      this.lastSecondStart = now
    }

    this.lastTickTime = performance.now()
    this.timers.tick.start('current')
  }

  /**
   * End timing a tick cycle
   * @param {Object} tickState - State at end of tick
   */
  endTick(tickState = {}) {
    if (!this.enabled) return

    const duration = this.timers.tick.stop('current')
    this.counters.ticks++
    this.ticksThisSecond++

    // Update gauges
    if (tickState.coherence !== undefined) {
      this.gauges.coherence = tickState.coherence
      this.coherenceHistory.push(tickState.coherence)
    }
    if (tickState.entropy !== undefined) {
      this.gauges.entropy = tickState.entropy
      this.entropyHistory.push(tickState.entropy)
    }
    if (tickState.temperature !== undefined) {
      this.gauges.temperature = tickState.temperature
    }
    if (tickState.orderParameter !== undefined) {
      this.gauges.orderParameter = tickState.orderParameter
    }
    if (tickState.isCoherent) {
      this.counters.coherentTicks++
    }

    // Check for bottleneck
    if (duration > this.bottleneckThresholds.tick) {
      this.recordBottleneck('tick', duration)
    }

    // Emit tick complete event
    this.emit('tick', {
      duration,
      tickNumber: this.counters.ticks,
      state: tickState,
    })
  }

  /**
   * Time a phase computation
   * @param {Function} fn - Function to time
   * @returns {*} Function result
   */
  timePhaseCompute(fn) {
    if (!this.enabled) return fn()
    return this.timers.phaseCompute.time(fn)
  }

  /**
   * Time a Kuramoto coupling step
   * @param {Function} fn - Function to time
   * @returns {*} Function result
   */
  timeKuramotoStep(fn) {
    if (!this.enabled) return fn()
    return this.timers.kuramotoStep.time(fn)
  }

  /**
   * Time thermal dynamics computation
   * @param {Function} fn - Function to time
   * @returns {*} Function result
   */
  timeThermalDynamics(fn) {
    if (!this.enabled) return fn()
    const result = this.timers.thermalDynamics.time(fn)
    this.counters.thermalEvents++
    return result
  }

  /**
   * Time an SMF update
   * @param {Function} fn - Function to time
   * @returns {*} Function result
   */
  timeSMFUpdate(fn) {
    if (!this.enabled) return fn()
    return this.timers.smfUpdate.time(fn)
  }

  /**
   * Time an SMF rotation
   * @param {Function} fn - Function to time
   * @returns {*} Function result
   */
  timeSMFRotate(fn) {
    if (!this.enabled) return fn()
    return this.timers.smfRotate.time(fn)
  }

  /**
   * Time codebook tunneling
   * @param {Function} fn - Function to time
   * @returns {*} Function result
   */
  timeCodebookTunnel(fn) {
    if (!this.enabled) return fn()
    this.counters.codebookTunnels++
    return this.timers.codebookTunnel.time(fn)
  }

  /**
   * Time a memory store operation
   * @param {Function} fn - Function to time
   * @returns {*} Function result
   */
  async timeMemoryStore(fn) {
    if (!this.enabled) return fn()
    this.counters.memoryStores++
    return this.timers.memoryStore.timeAsync(fn)
  }

  /**
   * Time a memory retrieve operation
   * @param {Function} fn - Function to time
   * @returns {*} Function result
   */
  async timeMemoryRetrieve(fn) {
    if (!this.enabled) return fn()
    this.counters.memoryRetrieves++
    return this.timers.memoryRetrieve.timeAsync(fn)
  }

  // ========================================================================
  // COUNTER METHODS
  // ========================================================================

  incrementCounter(name, amount = 1) {
    if (this.counters[name] !== undefined) {
      this.counters[name] += amount
    }
  }

  setGauge(name, value) {
    if (this.gauges[name] !== undefined) {
      this.gauges[name] = value
    }
  }

  // ========================================================================
  // BOTTLENECK DETECTION
  // ========================================================================

  recordBottleneck(component, duration) {
    const event = {
      component,
      duration,
      timestamp: Date.now(),
      tickNumber: this.counters.ticks,
      coherence: this.gauges.coherence,
      temperature: this.gauges.temperature,
    }

    this.bottleneckEvents.push(event)
    if (this.bottleneckEvents.length > this.maxBottleneckEvents) {
      this.bottleneckEvents.shift()
    }

    this.emit('bottleneck', event)
  }

  getBottleneckSummary() {
    const summary = {}

    for (const event of this.bottleneckEvents) {
      if (!summary[event.component]) {
        summary[event.component] = {
          count: 0,
          totalDuration: 0,
          maxDuration: 0,
        }
      }
      summary[event.component].count++
      summary[event.component].totalDuration += event.duration
      summary[event.component].maxDuration = Math.max(
        summary[event.component].maxDuration,
        event.duration,
      )
    }

    return summary
  }

  // ========================================================================
  // MEMORY MONITORING
  // ========================================================================

  startMemoryMonitoring() {
    this.memoryInterval = setInterval(() => {
      const usage = process.memoryUsage()
      this.gauges.heapUsed = usage.heapUsed
      this.gauges.heapTotal = usage.heapTotal
    }, 1000)
  }

  stopMemoryMonitoring() {
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval)
      this.memoryInterval = null
    }
  }

  // ========================================================================
  // ANALYSIS
  // ========================================================================

  /**
   * Analyze coherence trend
   * @returns {Object} Trend analysis
   */
  analyzeCoherenceTrend() {
    const samples = this.coherenceHistory.getAll()
    if (samples.length < 10) return { trend: 'insufficient_data' }

    const recent = samples.slice(-50)
    const older = samples.slice(-100, -50)

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
    const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg

    const delta = recentAvg - olderAvg

    return {
      trend: delta > 0.05 ? 'increasing' : delta < -0.05 ? 'decreasing' : 'stable',
      current: this.gauges.coherence,
      recentAverage: recentAvg,
      previousAverage: olderAvg,
      delta,
    }
  }

  /**
   * Analyze tick performance
   * @returns {Object} Performance analysis
   */
  analyzeTickPerformance() {
    const stats = this.timers.tick.getStats()
    const recentSamples = this.timers.tick.getRecentSamples(100)

    // Calculate variance
    const mean = recentSamples.reduce((a, b) => a + b, 0) / recentSamples.length || 0
    const variance =
      recentSamples.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / recentSamples.length ||
      0
    const stdDev = Math.sqrt(variance)

    // Detect jitter
    const jitterRatio = mean > 0 ? stdDev / mean : 0

    return {
      ...stats,
      currentTickRate: this.currentTickRate,
      avgTickRate:
        this.tickRateHistory.getAll().reduce((a, b) => a + b, 0) /
        Math.max(1, this.tickRateHistory.size),
      standardDeviation: stdDev,
      jitterRatio,
      stability: jitterRatio < 0.1 ? 'stable' : jitterRatio < 0.3 ? 'moderate' : 'unstable',
    }
  }

  /**
   * Get component breakdown
   * @returns {Object} Time breakdown by component
   */
  getComponentBreakdown() {
    const tickStats = this.timers.tick.getStats()
    const totalTime = tickStats.sum

    const breakdown = {}
    for (const [name, timer] of Object.entries(this.timers)) {
      if (name === 'tick') continue

      const stats = timer.getStats()
      breakdown[name] = {
        ...stats,
        percentOfTotal: totalTime > 0 ? (stats.sum / totalTime) * 100 : 0,
      }
    }

    return breakdown
  }

  // ========================================================================
  // REPORTING
  // ========================================================================

  /**
   * Get complete profile report
   * @returns {Object} Full profile report
   */
  getReport() {
    return {
      summary: {
        enabled: this.enabled,
        uptime: Date.now() - this.lastSecondStart + (this.counters.ticks * 1000) / 60,
        totalTicks: this.counters.ticks,
        coherentTicks: this.counters.coherentTicks,
        coherenceRatio:
          this.counters.ticks > 0 ? this.counters.coherentTicks / this.counters.ticks : 0,
      },

      gauges: { ...this.gauges },
      counters: { ...this.counters },

      timers: Object.fromEntries(
        Object.entries(this.timers).map(([name, timer]) => [name, timer.getStats()]),
      ),

      analysis: {
        tickPerformance: this.analyzeTickPerformance(),
        coherenceTrend: this.analyzeCoherenceTrend(),
        componentBreakdown: this.getComponentBreakdown(),
        bottlenecks: this.getBottleneckSummary(),
      },

      memory: {
        heapUsed: this.gauges.heapUsed,
        heapTotal: this.gauges.heapTotal,
        heapUsedMB: (this.gauges.heapUsed / 1024 / 1024).toFixed(2),
        heapTotalMB: (this.gauges.heapTotal / 1024 / 1024).toFixed(2),
      },

      timestamp: Date.now(),
    }
  }

  /**
   * Get compact metrics for monitoring
   * @returns {Object} Compact metrics
   */
  getMetrics() {
    const tickStats = this.timers.tick.getStats()

    return {
      tick_count: this.counters.ticks,
      tick_rate: this.currentTickRate,
      tick_mean_ms: tickStats.mean.toFixed(3),
      tick_p99_ms: tickStats.p99.toFixed(3),
      coherence: this.gauges.coherence.toFixed(4),
      entropy: this.gauges.entropy.toFixed(4),
      temperature: this.gauges.temperature.toFixed(4),
      order_parameter: this.gauges.orderParameter.toFixed(4),
      heap_mb: (this.gauges.heapUsed / 1024 / 1024).toFixed(2),
      bottleneck_count: this.bottleneckEvents.length,
    }
  }

  /**
   * Format report as string
   * @returns {string} Formatted report
   */
  formatReport() {
    const report = this.getReport()
    const lines = []

    lines.push('='.repeat(60))
    lines.push('OSCILLATOR DYNAMICS PROFILE')
    lines.push('='.repeat(60))

    lines.push('\n--- SUMMARY ---')
    lines.push(`Total Ticks: ${report.summary.totalTicks}`)
    lines.push(
      `Coherent Ticks: ${report.summary.coherentTicks} (${(report.summary.coherenceRatio * 100).toFixed(1)}%)`,
    )
    lines.push(`Current Tick Rate: ${report.analysis.tickPerformance.currentTickRate} ticks/s`)

    lines.push('\n--- CURRENT STATE ---')
    lines.push(`Coherence: ${this.gauges.coherence.toFixed(4)}`)
    lines.push(`Entropy: ${this.gauges.entropy.toFixed(4)}`)
    lines.push(`Temperature: ${this.gauges.temperature.toFixed(4)}`)
    lines.push(`Order Parameter: ${this.gauges.orderParameter.toFixed(4)}`)

    lines.push('\n--- TICK PERFORMANCE ---')
    const tp = report.analysis.tickPerformance
    lines.push(
      `Mean: ${tp.mean.toFixed(3)}ms, P50: ${tp.p50.toFixed(3)}ms, P99: ${tp.p99.toFixed(3)}ms`,
    )
    lines.push(`Stability: ${tp.stability} (jitter: ${(tp.jitterRatio * 100).toFixed(1)}%)`)

    lines.push('\n--- COMPONENT BREAKDOWN ---')
    for (const [name, stats] of Object.entries(report.analysis.componentBreakdown)) {
      if (stats.count > 0) {
        lines.push(
          `  ${name}: ${stats.mean.toFixed(3)}ms avg (${stats.percentOfTotal.toFixed(1)}%)`,
        )
      }
    }

    lines.push('\n--- MEMORY ---')
    lines.push(`Heap Used: ${report.memory.heapUsedMB} MB / ${report.memory.heapTotalMB} MB`)

    if (Object.keys(report.analysis.bottlenecks).length > 0) {
      lines.push('\n--- BOTTLENECKS ---')
      for (const [component, stats] of Object.entries(report.analysis.bottlenecks)) {
        lines.push(`  ${component}: ${stats.count} events, max ${stats.maxDuration.toFixed(2)}ms`)
      }
    }

    lines.push('\n' + '='.repeat(60))

    return lines.join('\n')
  }

  // ========================================================================
  // CONTROL
  // ========================================================================

  enable() {
    this.enabled = true
  }

  disable() {
    this.enabled = false
  }

  reset() {
    for (const timer of Object.values(this.timers)) {
      timer.reset()
    }

    for (const key of Object.keys(this.counters)) {
      this.counters[key] = 0
    }

    this.coherenceHistory.clear()
    this.entropyHistory.clear()
    this.tickRateHistory.clear()
    this.bottleneckEvents = []

    this.lastSecondStart = Date.now()
    this.ticksThisSecond = 0
    this.currentTickRate = 0
  }

  destroy() {
    this.stopMemoryMonitoring()
    this.removeAllListeners()
    this.reset()
  }
}

// ============================================================================
// GLOBAL INSTANCE
// ============================================================================

const globalProfiler = new OscillatorProfiler()

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Classes
  OscillatorProfiler,
  Timer,
  Histogram,
  RingBuffer,

  // Constants
  MetricType,
  HISTOGRAM_BUCKETS,

  // Global instance
  globalProfiler,
}
