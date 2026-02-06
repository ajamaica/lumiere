/**
 * Snapshot Integrity and Backup Manager
 *
 * Provides SHA-256 hash verification for snapshots with automatic backup.
 * Features:
 * - SHA-256 hash computation and verification on save/load
 * - Automatic backup of last known good snapshot
 * - Recovery from corrupted snapshots
 * - Incremental snapshot chains with integrity validation
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const zlib = require('zlib')
const { promisify } = require('util')

const gzip = promisify(zlib.gzip)
const gunzip = promisify(zlib.gunzip)

// ============================================================================
// SNAPSHOT METADATA
// ============================================================================

/**
 * Snapshot metadata header format
 */
const SNAPSHOT_MAGIC = Buffer.from('SNPT') // 4 bytes
const SNAPSHOT_VERSION = 1

/**
 * Create snapshot header
 * @param {Object} options - Header options
 * @returns {Buffer}
 */
function createHeader(options = {}) {
  const header = Buffer.alloc(64)
  let offset = 0

  // Magic bytes
  SNAPSHOT_MAGIC.copy(header, offset)
  offset += 4

  // Version
  header.writeUInt16LE(SNAPSHOT_VERSION, offset)
  offset += 2

  // Flags (compressed, encrypted, etc.)
  const flags =
    (options.compressed ? 0x01 : 0) |
    (options.encrypted ? 0x02 : 0) |
    (options.incremental ? 0x04 : 0)
  header.writeUInt16LE(flags, offset)
  offset += 2

  // Timestamp
  const timestamp = options.timestamp || Date.now()
  header.writeBigInt64LE(BigInt(timestamp), offset)
  offset += 8

  // Parent hash (for incremental snapshots)
  if (options.parentHash) {
    const parentHashBuf = Buffer.from(options.parentHash, 'hex')
    parentHashBuf.copy(header, offset, 0, 32)
  }
  offset += 32

  // Data length (filled later)
  // offset += 4

  // Reserved
  // offset += 12

  return header
}

/**
 * Parse snapshot header
 * @param {Buffer} header - Header buffer
 * @returns {Object}
 */
function parseHeader(header) {
  if (header.length < 64) {
    throw new Error('Header too short')
  }

  // Check magic
  if (header.compare(SNAPSHOT_MAGIC, 0, 4, 0, 4) !== 0) {
    throw new Error('Invalid snapshot magic')
  }

  let offset = 4

  const version = header.readUInt16LE(offset)
  offset += 2

  const flags = header.readUInt16LE(offset)
  offset += 2

  const timestamp = Number(header.readBigInt64LE(offset))
  offset += 8

  const parentHash = header.slice(offset, offset + 32).toString('hex')
  offset += 32

  const dataLength = header.readUInt32LE(offset)
  offset += 4

  return {
    version,
    compressed: !!(flags & 0x01),
    encrypted: !!(flags & 0x02),
    incremental: !!(flags & 0x04),
    timestamp,
    parentHash: parentHash === '0'.repeat(64) ? null : parentHash,
    dataLength,
  }
}

// ============================================================================
// INTEGRITY MANAGER
// ============================================================================

/**
 * SnapshotIntegrityManager
 *
 * Manages snapshot creation, verification, and recovery.
 */
class SnapshotIntegrityManager {
  constructor(options = {}) {
    this.snapshotDir = options.snapshotDir || './data/snapshots'
    this.backupDir = options.backupDir || './data/snapshots/backup'
    this.maxBackups = options.maxBackups || 5
    this.compress = options.compress ?? true
    this.algorithm = options.algorithm || 'sha256'

    // Tracking
    this.lastGoodHash = null
    this.lastGoodPath = null
    this.snapshotHistory = []
    this.maxHistory = options.maxHistory || 100
  }

  /**
   * Initialize the manager
   */
  async initialize() {
    await fs.promises.mkdir(this.snapshotDir, { recursive: true })
    await fs.promises.mkdir(this.backupDir, { recursive: true })

    // Load last good hash from meta file if exists
    await this.loadMeta()
  }

  /**
   * Load metadata from disk
   */
  async loadMeta() {
    const metaPath = path.join(this.snapshotDir, 'meta.json')
    try {
      const content = await fs.promises.readFile(metaPath, 'utf-8')
      const meta = JSON.parse(content)
      this.lastGoodHash = meta.lastGoodHash
      this.lastGoodPath = meta.lastGoodPath
      this.snapshotHistory = meta.history || []
    } catch (e) {
      // No metadata yet
    }
  }

  /**
   * Save metadata to disk
   */
  async saveMeta() {
    const metaPath = path.join(this.snapshotDir, 'meta.json')
    const meta = {
      lastGoodHash: this.lastGoodHash,
      lastGoodPath: this.lastGoodPath,
      history: this.snapshotHistory.slice(-this.maxHistory),
      updatedAt: Date.now(),
    }
    await fs.promises.writeFile(metaPath, JSON.stringify(meta, null, 2))
  }

  /**
   * Compute hash of data
   * @param {Buffer} data - Data to hash
   * @returns {string}
   */
  computeHash(data) {
    return crypto.createHash(this.algorithm).update(data).digest('hex')
  }

  /**
   * Create a snapshot with integrity verification
   * @param {*} data - Data to snapshot (will be JSON serialized)
   * @param {Object} options - Snapshot options
   * @returns {Promise<Object>}
   */
  async createSnapshot(data, options = {}) {
    const name = options.name || `snapshot-${Date.now()}`
    const snapshotPath = path.join(this.snapshotDir, `${name}.snap`)

    // Serialize data
    let dataBuffer = Buffer.from(JSON.stringify(data))

    // Compress if enabled
    if (this.compress) {
      dataBuffer = await gzip(dataBuffer)
    }

    // Compute hash of serialized data
    const dataHash = this.computeHash(dataBuffer)

    // Create header
    const header = createHeader({
      compressed: this.compress,
      timestamp: Date.now(),
      parentHash: options.parentHash || this.lastGoodHash,
    })

    // Write data length to header
    header.writeUInt32LE(dataBuffer.length, 48)

    // Create hash of header + data
    const fullHash = this.computeHash(Buffer.concat([header, dataBuffer]))

    // Write snapshot file
    const fd = await fs.promises.open(snapshotPath, 'w')
    try {
      await fd.write(header)
      await fd.write(dataBuffer)
      await fd.write(Buffer.from(fullHash, 'hex')) // Append hash at end
    } finally {
      await fd.close()
    }

    // Verify write
    const verified = await this.verifySnapshot(snapshotPath)
    if (!verified.valid) {
      await fs.promises.unlink(snapshotPath)
      throw new Error(`Snapshot verification failed: ${verified.error}`)
    }

    // Backup previous good snapshot
    if (this.lastGoodPath && this.lastGoodPath !== snapshotPath) {
      await this.createBackup(this.lastGoodPath)
    }

    // Update tracking
    this.lastGoodHash = fullHash
    this.lastGoodPath = snapshotPath
    this.snapshotHistory.push({
      path: snapshotPath,
      hash: fullHash,
      dataHash,
      timestamp: Date.now(),
      size: header.length + dataBuffer.length + 32,
    })

    await this.saveMeta()

    return {
      path: snapshotPath,
      hash: fullHash,
      dataHash,
      size: header.length + dataBuffer.length + 32,
    }
  }

  /**
   * Verify snapshot integrity
   * @param {string} snapshotPath - Path to snapshot
   * @returns {Promise<Object>}
   */
  async verifySnapshot(snapshotPath) {
    try {
      const stat = await fs.promises.stat(snapshotPath)
      if (stat.size < 64 + 32) {
        return { valid: false, error: 'File too small' }
      }

      const fd = await fs.promises.open(snapshotPath, 'r')
      try {
        // Read header
        const header = Buffer.alloc(64)
        await fd.read(header, 0, 64, 0)

        const headerInfo = parseHeader(header)

        // Read data
        const dataLength = headerInfo.dataLength
        const dataBuffer = Buffer.alloc(dataLength)
        await fd.read(dataBuffer, 0, dataLength, 64)

        // Read stored hash
        const storedHash = Buffer.alloc(32)
        await fd.read(storedHash, 0, 32, 64 + dataLength)
        const storedHashHex = storedHash.toString('hex')

        // Compute hash
        const computedHash = this.computeHash(Buffer.concat([header, dataBuffer]))

        if (computedHash !== storedHashHex) {
          return {
            valid: false,
            error: 'Hash mismatch',
            expected: storedHashHex,
            computed: computedHash,
          }
        }

        return {
          valid: true,
          header: headerInfo,
          hash: computedHash,
          size: stat.size,
        }
      } finally {
        await fd.close()
      }
    } catch (e) {
      return { valid: false, error: e.message }
    }
  }

  /**
   * Load a snapshot with integrity verification
   * @param {string} snapshotPath - Path to snapshot (or null for latest)
   * @returns {Promise<Object>}
   */
  async loadSnapshot(snapshotPath = null) {
    const targetPath = snapshotPath || this.lastGoodPath

    if (!targetPath) {
      throw new Error('No snapshot path specified and no last good snapshot')
    }

    // Verify first
    const verification = await this.verifySnapshot(targetPath)
    if (!verification.valid) {
      // Attempt recovery from backup
      const recovered = await this.recoverFromBackup()
      if (!recovered) {
        throw new Error(`Snapshot corrupted and no valid backup: ${verification.error}`)
      }

      // Load recovered snapshot
      return this.loadSnapshot(recovered.path)
    }

    // Read and decompress
    const fd = await fs.promises.open(targetPath, 'r')
    try {
      // Skip header
      const header = Buffer.alloc(64)
      await fd.read(header, 0, 64, 0)
      const headerInfo = parseHeader(header)

      // Read data
      const dataBuffer = Buffer.alloc(headerInfo.dataLength)
      await fd.read(dataBuffer, 0, headerInfo.dataLength, 64)

      // Decompress if needed
      let finalData = dataBuffer
      if (headerInfo.compressed) {
        finalData = await gunzip(dataBuffer)
      }

      // Parse JSON
      const data = JSON.parse(finalData.toString())

      return {
        data,
        header: headerInfo,
        hash: verification.hash,
        path: targetPath,
      }
    } finally {
      await fd.close()
    }
  }

  /**
   * Create backup of a snapshot
   * @param {string} snapshotPath - Path to snapshot to backup
   */
  async createBackup(snapshotPath) {
    const fileName = path.basename(snapshotPath)
    const backupName = `${Date.now()}-${fileName}`
    const backupPath = path.join(this.backupDir, backupName)

    await fs.promises.copyFile(snapshotPath, backupPath)

    // Prune old backups
    await this.pruneBackups()
  }

  /**
   * Prune old backups to maintain maxBackups limit
   */
  async pruneBackups() {
    const files = await fs.promises.readdir(this.backupDir)
    const backups = files
      .filter((f) => f.endsWith('.snap'))
      .map((f) => ({
        name: f,
        path: path.join(this.backupDir, f),
        timestamp: parseInt(f.split('-')[0]) || 0,
      }))
      .sort((a, b) => b.timestamp - a.timestamp)

    // Remove oldest backups beyond limit
    for (let i = this.maxBackups; i < backups.length; i++) {
      await fs.promises.unlink(backups[i].path)
    }
  }

  /**
   * Attempt recovery from backup
   * @returns {Promise<Object|null>}
   */
  async recoverFromBackup() {
    const files = await fs.promises.readdir(this.backupDir)
    const backups = files
      .filter((f) => f.endsWith('.snap'))
      .map((f) => ({
        name: f,
        path: path.join(this.backupDir, f),
        timestamp: parseInt(f.split('-')[0]) || 0,
      }))
      .sort((a, b) => b.timestamp - a.timestamp)

    // Try each backup from newest to oldest
    for (const backup of backups) {
      const verification = await this.verifySnapshot(backup.path)
      if (verification.valid) {
        // Restore this backup
        const restoredPath = path.join(this.snapshotDir, 'recovered.snap')
        await fs.promises.copyFile(backup.path, restoredPath)

        this.lastGoodPath = restoredPath
        this.lastGoodHash = verification.hash
        await this.saveMeta()

        return {
          path: restoredPath,
          hash: verification.hash,
          recoveredFrom: backup.path,
        }
      }
    }

    return null
  }

  /**
   * List all snapshots with verification status
   * @returns {Promise<Array>}
   */
  async listSnapshots() {
    const files = await fs.promises.readdir(this.snapshotDir)
    const snapshots = []

    for (const file of files) {
      if (!file.endsWith('.snap')) continue

      const filePath = path.join(this.snapshotDir, file)
      const verification = await this.verifySnapshot(filePath)
      const stat = await fs.promises.stat(filePath)

      snapshots.push({
        name: file,
        path: filePath,
        size: stat.size,
        mtime: stat.mtime,
        valid: verification.valid,
        hash: verification.hash,
        error: verification.error,
      })
    }

    return snapshots.sort((a, b) => b.mtime - a.mtime)
  }

  /**
   * Get status
   * @returns {Object}
   */
  getStatus() {
    return {
      snapshotDir: this.snapshotDir,
      backupDir: this.backupDir,
      lastGoodHash: this.lastGoodHash,
      lastGoodPath: this.lastGoodPath,
      historyCount: this.snapshotHistory.length,
    }
  }
}

// ============================================================================
// INCREMENTAL SNAPSHOT CHAIN
// ============================================================================

/**
 * IncrementalSnapshotChain
 *
 * Manages a chain of incremental snapshots with integrity verification.
 */
class IncrementalSnapshotChain extends SnapshotIntegrityManager {
  constructor(options = {}) {
    super(options)
    this.baseSnapshot = null
    this.deltas = []
    this.maxDeltasBeforeCompaction = options.maxDeltasBeforeCompaction || 10
  }

  /**
   * Create base snapshot
   * @param {*} data - Full data
   * @returns {Promise<Object>}
   */
  async createBase(data) {
    const result = await this.createSnapshot(data, { name: 'base' })
    this.baseSnapshot = result
    this.deltas = []
    return result
  }

  /**
   * Create delta snapshot
   * @param {Object} delta - Changes since last snapshot
   * @returns {Promise<Object>}
   */
  async createDelta(delta) {
    if (!this.baseSnapshot) {
      throw new Error('No base snapshot exists')
    }

    const parentHash =
      this.deltas.length > 0 ? this.deltas[this.deltas.length - 1].hash : this.baseSnapshot.hash

    const deltaData = {
      type: 'delta',
      parentHash,
      changes: delta,
      timestamp: Date.now(),
    }

    const result = await this.createSnapshot(deltaData, {
      name: `delta-${Date.now()}`,
      parentHash,
    })

    this.deltas.push(result)

    // Auto-compact if too many deltas
    if (this.deltas.length >= this.maxDeltasBeforeCompaction) {
      await this.compact()
    }

    return result
  }

  /**
   * Reconstruct full state from base + deltas
   * @param {Function} applyDelta - Function to apply delta to state
   * @returns {Promise<Object>}
   */
  async reconstruct(applyDelta) {
    if (!this.baseSnapshot) {
      throw new Error('No base snapshot exists')
    }

    // Load base
    const base = await this.loadSnapshot(this.baseSnapshot.path)
    let state = base.data

    // Apply deltas in order
    for (const delta of this.deltas) {
      const deltaData = await this.loadSnapshot(delta.path)

      // Verify chain
      if (
        deltaData.data.parentHash !==
        (this.deltas.indexOf(delta) === 0
          ? this.baseSnapshot.hash
          : this.deltas[this.deltas.indexOf(delta) - 1].hash)
      ) {
        throw new Error('Delta chain integrity broken')
      }

      state = applyDelta(state, deltaData.data.changes)
    }

    return state
  }

  /**
   * Compact deltas into new base
   * @param {Function} applyDelta - Function to apply delta to state
   * @returns {Promise<Object>}
   */
  async compact(applyDelta) {
    const fullState = await this.reconstruct(applyDelta)

    // Archive old snapshots
    for (const delta of this.deltas) {
      await this.createBackup(delta.path)
      await fs.promises.unlink(delta.path)
    }

    if (this.baseSnapshot) {
      await this.createBackup(this.baseSnapshot.path)
      await fs.promises.unlink(this.baseSnapshot.path)
    }

    // Create new base
    return this.createBase(fullState)
  }

  getStatus() {
    return {
      ...super.getStatus(),
      hasBase: !!this.baseSnapshot,
      deltaCount: this.deltas.length,
      maxDeltasBeforeCompaction: this.maxDeltasBeforeCompaction,
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Header utilities
  createHeader,
  parseHeader,
  SNAPSHOT_MAGIC,
  SNAPSHOT_VERSION,

  // Managers
  SnapshotIntegrityManager,
  IncrementalSnapshotChain,
}
