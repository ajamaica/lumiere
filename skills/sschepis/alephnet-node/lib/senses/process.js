/**
 * Process Sense - System State Awareness
 *
 * Awareness of the runtime environment:
 * - Memory usage (heap)
 * - Process uptime
 * - Node.js version
 * - Platform info
 */

const { Sense } = require('./base')
const os = require('os')

class ProcessSense extends Sense {
  constructor(options = {}) {
    super({ name: 'process', ...options })
    this.refreshRate = 5000 // 5 seconds
    this.startTime = Date.now()
  }

  async read() {
    const memUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()

    // Calculate approximate CPU percentage
    const uptime = process.uptime()
    const totalCpuTime = (cpuUsage.user + cpuUsage.system) / 1000000 // Convert to seconds
    const cpuPercent = uptime > 0 ? totalCpuTime / uptime : 0

    return {
      pid: process.pid,
      uptime: uptime,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      heapPercent: memUsage.heapTotal > 0 ? memUsage.heapUsed / memUsage.heapTotal : 0,
      external: memUsage.external,
      rss: memUsage.rss,
      cwd: process.cwd(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpuUsage: Math.min(1, cpuPercent),
      cpuCores: os.cpus().length,
      freeMem: os.freemem(),
      totalMem: os.totalmem(),
      loadAvg: os.loadavg()[0], // 1 minute load average
    }
  }

  measureDeviation(reading) {
    let deviation = 0

    // High heap usage is notable
    if (reading.heapPercent > 0.7) deviation += 0.3
    if (reading.heapPercent > 0.9) deviation += 0.3

    // High load average
    const normalizedLoad = reading.loadAvg / reading.cpuCores
    if (normalizedLoad > 0.8) deviation += 0.3

    return Math.min(1, deviation)
  }

  getAnomalies(reading) {
    const anomalies = []

    if (reading.heapPercent > 0.85) {
      anomalies.push({
        sense: 'process',
        type: 'high_memory',
        message: `Memory usage at ${(reading.heapPercent * 100).toFixed(0)}%`,
        salience: 0.8,
      })
    }

    const normalizedLoad = reading.loadAvg / reading.cpuCores
    if (normalizedLoad > 1.0) {
      anomalies.push({
        sense: 'process',
        type: 'high_load',
        message: `System load ${reading.loadAvg.toFixed(2)} (${reading.cpuCores} cores)`,
        salience: 0.7,
      })
    }

    return anomalies
  }

  formatForPrompt(senseData) {
    const r = senseData.reading
    if (!r) return 'System: [unavailable]'

    const formatBytes = (bytes) => {
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
      return `${(bytes / (1024 * 1024)).toFixed(0)}MB`
    }

    const formatDuration = (seconds) => {
      if (seconds < 60) return `${Math.floor(seconds)}s`
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
      const h = Math.floor(seconds / 3600)
      const m = Math.floor((seconds % 3600) / 60)
      return `${h}h ${m}m`
    }

    const heap = `Heap ${formatBytes(r.heapUsed)}/${formatBytes(r.heapTotal)}`
    const uptime = `Uptime ${formatDuration(r.uptime)}`

    return `**System**: ${heap} | ${uptime} | ${r.platform}/${r.arch}`
  }
}

module.exports = { ProcessSense }
