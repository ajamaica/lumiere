/**
 * Filesystem Sense - Environmental Awareness
 *
 * Awareness of the file system environment:
 * - Focused directory
 * - Directory tree (depth-limited by aperture)
 * - Recent file changes
 * - Notable markers (README, package.json, .git)
 */

const { Sense } = require('./base')
const fs = require('fs')
const path = require('path')

class FilesystemSense extends Sense {
  constructor(options = {}) {
    super({ name: 'filesystem', ...options })
    this.focus = options.focus || process.cwd()
    this.refreshRate = 10000 // 10 seconds
    this.knownFiles = new Map() // path -> mtime for change detection
  }

  /**
   * Get depth limit based on aperture
   */
  getDepthLimit() {
    switch (this.aperture) {
      case 'narrow':
        return 0 // Just the focused directory
      case 'medium':
        return 1 // One level deep
      case 'wide':
        return 3 // Three levels deep
      default:
        return 1
    }
  }

  /**
   * Get max files to track based on aperture
   */
  getMaxFiles() {
    switch (this.aperture) {
      case 'narrow':
        return 20
      case 'medium':
        return 50
      case 'wide':
        return 100
      default:
        return 50
    }
  }

  /**
   * Scan directory recursively
   */
  async scanDirectory(dirPath, depth = 0, maxDepth = 1) {
    const entries = []
    const stats = { files: 0, dirs: 0, totalSize: 0 }

    try {
      const items = await fs.promises.readdir(dirPath, { withFileTypes: true })

      for (const item of items) {
        // Skip hidden files and common ignored dirs
        if (
          item.name.startsWith('.') ||
          ['node_modules', 'dist', 'build', '__pycache__', '.git'].includes(item.name)
        ) {
          continue
        }

        const fullPath = path.join(dirPath, item.name)

        if (item.isDirectory()) {
          stats.dirs++
          const entry = { type: 'dir', name: item.name, path: fullPath }

          if (depth < maxDepth) {
            const subScan = await this.scanDirectory(fullPath, depth + 1, maxDepth)
            entry.children = subScan.entries.length
            stats.files += subScan.stats.files
            stats.dirs += subScan.stats.dirs
            stats.totalSize += subScan.stats.totalSize
          }

          entries.push(entry)
        } else if (item.isFile()) {
          stats.files++
          try {
            const fileStat = await fs.promises.stat(fullPath)
            stats.totalSize += fileStat.size
            entries.push({
              type: 'file',
              name: item.name,
              path: fullPath,
              size: fileStat.size,
              mtime: fileStat.mtime.toISOString(),
            })
          } catch (e) {
            entries.push({ type: 'file', name: item.name, path: fullPath })
          }
        }
      }
    } catch (error) {
      // Directory not accessible
    }

    return { entries, stats }
  }

  /**
   * Detect recent changes by comparing mtimes
   */
  detectChanges(entries) {
    const changes = []
    const now = Date.now()
    const newKnownFiles = new Map()

    for (const entry of entries) {
      if (entry.type !== 'file') continue

      newKnownFiles.set(entry.path, entry.mtime)

      const oldMtime = this.knownFiles.get(entry.path)

      if (!oldMtime) {
        // New file
        const age = now - new Date(entry.mtime).getTime()
        if (age < 300000) {
          // Created in last 5 minutes
          changes.push({ path: entry.name, delta: 'created', age })
        }
      } else if (oldMtime !== entry.mtime) {
        // Modified file
        const age = now - new Date(entry.mtime).getTime()
        changes.push({ path: entry.name, delta: 'modified', age })
      }
    }

    // Check for deleted files
    for (const [oldPath, oldMtime] of this.knownFiles) {
      if (!newKnownFiles.has(oldPath)) {
        changes.push({ path: path.basename(oldPath), delta: 'deleted', age: 0 })
      }
    }

    this.knownFiles = newKnownFiles
    return changes.slice(0, 10) // Limit to 10 most relevant
  }

  /**
   * Detect project markers
   */
  detectMarkers(entries) {
    const markers = {
      hasGit: false,
      hasPackageJson: false,
      hasReadme: false,
      hasCargo: false,
      hasPyproject: false,
      language: 'unknown',
    }

    const extensions = {}

    for (const entry of entries) {
      const name = entry.name.toLowerCase()

      if (name === 'package.json') markers.hasPackageJson = true
      if (name === 'readme.md' || name === 'readme.txt' || name === 'readme')
        markers.hasReadme = true
      if (name === 'cargo.toml') markers.hasCargo = true
      if (name === 'pyproject.toml' || name === 'setup.py') markers.hasPyproject = true

      if (entry.type === 'file') {
        const ext = path.extname(name)
        extensions[ext] = (extensions[ext] || 0) + 1
      }
    }

    // Check for .git in parent
    try {
      if (fs.existsSync(path.join(this.focus, '.git'))) {
        markers.hasGit = true
      }
    } catch (e) {}

    // Determine primary language
    const langMap = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.py': 'python',
      '.rs': 'rust',
      '.go': 'go',
      '.java': 'java',
      '.rb': 'ruby',
      '.cpp': 'c++',
      '.c': 'c',
    }

    let maxExt = ''
    let maxCount = 0
    for (const [ext, count] of Object.entries(extensions)) {
      if (count > maxCount && langMap[ext]) {
        maxCount = count
        maxExt = ext
      }
    }

    if (maxExt) markers.language = langMap[maxExt]

    return markers
  }

  async read() {
    const depthLimit = this.getDepthLimit()
    const { entries, stats } = await this.scanDirectory(this.focus, 0, depthLimit)

    // Sort entries: dirs first, then by name
    entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    // Limit tree size
    const tree = entries.slice(0, this.getMaxFiles())

    const recentChanges = this.detectChanges(entries.filter((e) => e.type === 'file'))
    const markers = this.detectMarkers(entries)

    return {
      directory: this.focus,
      stats: {
        totalFiles: stats.files,
        totalDirs: stats.dirs,
        sizeBytes: stats.totalSize,
      },
      tree,
      recentChanges,
      markers,
    }
  }

  measureDeviation(reading) {
    let deviation = 0

    // Recent changes are notable
    if (reading.recentChanges.length > 0) {
      deviation += 0.3 + reading.recentChanges.length * 0.1
    }

    return Math.min(1, deviation)
  }

  getAnomalies(reading) {
    const anomalies = []

    for (const change of reading.recentChanges) {
      if (change.delta === 'created') {
        anomalies.push({
          sense: 'filesystem',
          type: 'new_file',
          message: `New file: ${change.path}`,
          salience: 0.7,
        })
      } else if (change.delta === 'deleted') {
        anomalies.push({
          sense: 'filesystem',
          type: 'deleted_file',
          message: `Deleted: ${change.path}`,
          salience: 0.6,
        })
      } else if (change.age < 60000) {
        // Modified in last minute
        anomalies.push({
          sense: 'filesystem',
          type: 'recent_change',
          message: `Recently modified: ${change.path}`,
          salience: 0.5,
        })
      }
    }

    return anomalies
  }

  formatForPrompt(senseData) {
    const r = senseData.reading
    if (!r) return 'Env: [unavailable]'

    const formatSize = (bytes) => {
      if (bytes < 1024) return `${bytes}B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
      return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
    }

    const formatAge = (ms) => {
      if (ms < 60000) return `${Math.floor(ms / 1000)}s`
      if (ms < 3600000) return `${Math.floor(ms / 60000)}m`
      return `${Math.floor(ms / 3600000)}h`
    }

    const dir = path.basename(r.directory)
    const stats = `${r.stats.totalFiles} files, ${r.stats.totalDirs} dirs`

    let changes = ''
    if (r.recentChanges.length > 0) {
      const recent = r.recentChanges
        .slice(0, 2)
        .map((c) => `${c.path} (${formatAge(c.age)} ago)`)
        .join(', ')
      changes = ` | Recent: ${recent}`
    }

    const lang = r.markers.language !== 'unknown' ? ` | ${r.markers.language}` : ''

    return `**Env**: ./${dir} (${stats})${changes}${lang}`
  }
}

module.exports = { FilesystemSense }
