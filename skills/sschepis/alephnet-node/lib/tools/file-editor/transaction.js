/**
 * File Transaction Manager
 *
 * Provides atomic multi-file operations with rollback on failure.
 * Features:
 * - Stage multiple file edits before committing
 * - Automatic backup creation
 * - Rollback on any failure
 * - Dry-run mode for validation
 * - Conflict detection
 */

const fs = require('fs').promises
const path = require('path')
const crypto = require('crypto')
const { applyPatch, applyPatches, validateEdit } = require('./patchEngine')

// ============================================================================
// TRANSACTION STATES
// ============================================================================

const TransactionState = {
  PENDING: 'pending', // Transaction created, edits being staged
  VALIDATING: 'validating', // Validation in progress
  VALIDATED: 'validated', // All edits validated successfully
  COMMITTING: 'committing', // Writing changes to disk
  COMMITTED: 'committed', // All changes written successfully
  ROLLING_BACK: 'rolling_back', // Rollback in progress
  ROLLED_BACK: 'rolled_back', // Rollback completed
  FAILED: 'failed', // Transaction failed
  ABORTED: 'aborted', // Transaction aborted by user
}

// ============================================================================
// FILE TRANSACTION
// ============================================================================

/**
 * FileTransaction
 *
 * Manages atomic multi-file edit operations.
 */
class FileTransaction {
  /**
   * Create a new file transaction
   * @param {Object} options - Transaction options
   */
  constructor(options = {}) {
    this.id = crypto.randomBytes(8).toString('hex')
    this.state = TransactionState.PENDING
    this.createdAt = Date.now()

    // Staged edits by file path
    this.stagedEdits = new Map() // filePath -> Array<edit>

    // Original file contents for rollback
    this.originalContents = new Map() // filePath -> original content

    // Computed modified contents
    this.modifiedContents = new Map() // filePath -> modified content

    // Backup locations
    this.backups = new Map() // filePath -> backup path

    // Options
    this.baseDir = options.baseDir || process.cwd()
    this.createBackups = options.createBackups ?? true
    this.backupDir = options.backupDir || path.join(this.baseDir, '.file-tx-backups')
    this.validateBeforeCommit = options.validateBeforeCommit ?? true

    // Tracking
    this.validationErrors = []
    this.commitErrors = []
    this.rollbackErrors = []
  }

  /**
   * Resolve a file path relative to base directory
   * @param {string} filePath - File path (relative or absolute)
   * @returns {string} Absolute path
   */
  resolvePath(filePath) {
    if (path.isAbsolute(filePath)) return filePath
    return path.resolve(this.baseDir, filePath)
  }

  /**
   * Stage an edit for a file
   * @param {string} filePath - Path to file
   * @param {Object} edit - Edit object with searchBlock and replaceBlock
   * @returns {FileTransaction} this for chaining
   */
  stage(filePath, edit) {
    this.assertState(TransactionState.PENDING)

    const resolved = this.resolvePath(filePath)

    // Validate edit structure
    const validation = validateEdit({ ...edit, filePath: resolved })
    if (!validation.valid) {
      throw new Error(`Invalid edit: ${validation.issues.join(', ')}`)
    }

    // Add to staged edits
    if (!this.stagedEdits.has(resolved)) {
      this.stagedEdits.set(resolved, [])
    }
    this.stagedEdits.get(resolved).push({
      ...edit,
      filePath: resolved,
      stagedAt: Date.now(),
    })

    return this
  }

  /**
   * Stage multiple edits at once
   * @param {Array} edits - Array of {filePath, searchBlock, replaceBlock}
   * @returns {FileTransaction} this for chaining
   */
  stageAll(edits) {
    for (const edit of edits) {
      this.stage(edit.filePath, edit)
    }
    return this
  }

  /**
   * Unstage edits for a file
   * @param {string} filePath - Path to file
   * @returns {FileTransaction} this for chaining
   */
  unstage(filePath) {
    this.assertState(TransactionState.PENDING)

    const resolved = this.resolvePath(filePath)
    this.stagedEdits.delete(resolved)

    return this
  }

  /**
   * Clear all staged edits
   * @returns {FileTransaction} this for chaining
   */
  clear() {
    this.assertState(TransactionState.PENDING)

    this.stagedEdits.clear()
    this.originalContents.clear()
    this.modifiedContents.clear()
    this.validationErrors = []

    return this
  }

  /**
   * Get staged edit count
   * @returns {number} Total number of staged edits
   */
  getStagedCount() {
    let count = 0
    for (const edits of this.stagedEdits.values()) {
      count += edits.length
    }
    return count
  }

  /**
   * Get list of files with staged edits
   * @returns {Array<string>} File paths
   */
  getStagedFiles() {
    return Array.from(this.stagedEdits.keys())
  }

  /**
   * Validate all staged edits (dry run)
   * @returns {Promise<Object>} Validation result
   */
  async validate() {
    this.state = TransactionState.VALIDATING
    this.validationErrors = []

    const results = {
      valid: true,
      files: [],
      errors: [],
    }

    for (const [filePath, edits] of this.stagedEdits) {
      const fileResult = {
        filePath,
        exists: false,
        readable: false,
        editsValid: false,
        previewAvailable: false,
        errors: [],
      }

      try {
        // Check file exists and is readable
        const content = await fs.readFile(filePath, 'utf-8')
        fileResult.exists = true
        fileResult.readable = true
        this.originalContents.set(filePath, content)

        // Try to apply all edits for this file
        const patchResult = applyPatches(content, edits)

        if (patchResult.failed > 0) {
          fileResult.errors.push(...patchResult.errors.map((e) => e.error))
          results.valid = false
        } else {
          fileResult.editsValid = true
          fileResult.previewAvailable = true
          this.modifiedContents.set(filePath, patchResult.finalContent)
        }
      } catch (error) {
        if (error.code === 'ENOENT') {
          fileResult.errors.push(`File not found: ${filePath}`)
        } else if (error.code === 'EACCES') {
          fileResult.errors.push(`Permission denied: ${filePath}`)
        } else {
          fileResult.errors.push(error.message)
        }
        results.valid = false
      }

      results.files.push(fileResult)
      if (fileResult.errors.length > 0) {
        this.validationErrors.push(...fileResult.errors.map((e) => ({ filePath, error: e })))
        results.errors.push(...fileResult.errors.map((e) => ({ filePath, error: e })))
      }
    }

    this.state = results.valid ? TransactionState.VALIDATED : TransactionState.PENDING

    return results
  }

  /**
   * Preview modified content for a file
   * @param {string} filePath - Path to file
   * @returns {string|null} Modified content or null if not validated
   */
  preview(filePath) {
    const resolved = this.resolvePath(filePath)
    return this.modifiedContents.get(resolved) || null
  }

  /**
   * Get diff for a file
   * @param {string} filePath - Path to file
   * @returns {Object|null} Diff info
   */
  getDiff(filePath) {
    const resolved = this.resolvePath(filePath)
    const original = this.originalContents.get(resolved)
    const modified = this.modifiedContents.get(resolved)

    if (!original || !modified) return null

    return {
      filePath: resolved,
      original,
      modified,
      originalLines: original.split('\n').length,
      modifiedLines: modified.split('\n').length,
      changed: original !== modified,
    }
  }

  /**
   * Create backup of a file
   * @param {string} filePath - File to backup
   * @returns {Promise<string>} Backup path
   */
  async createBackup(filePath) {
    // Ensure backup directory exists
    await fs.mkdir(this.backupDir, { recursive: true })

    const fileName = path.basename(filePath)
    const backupName = `${this.id}-${Date.now()}-${fileName}`
    const backupPath = path.join(this.backupDir, backupName)

    await fs.copyFile(filePath, backupPath)
    this.backups.set(filePath, backupPath)

    return backupPath
  }

  /**
   * Commit all staged changes
   * @returns {Promise<Object>} Commit result
   */
  async commit() {
    // Validate if not already validated
    if (this.validateBeforeCommit && this.state !== TransactionState.VALIDATED) {
      const validation = await this.validate()
      if (!validation.valid) {
        return {
          success: false,
          error: 'Validation failed',
          validationErrors: validation.errors,
        }
      }
    }

    this.state = TransactionState.COMMITTING
    this.commitErrors = []

    const committedFiles = []
    const results = {
      success: true,
      filesCommitted: 0,
      editsApplied: 0,
      backupsCreated: 0,
      errors: [],
    }

    try {
      // Create backups first
      if (this.createBackups) {
        for (const filePath of this.modifiedContents.keys()) {
          await this.createBackup(filePath)
          results.backupsCreated++
        }
      }

      // Write all modified files
      for (const [filePath, content] of this.modifiedContents) {
        try {
          await fs.writeFile(filePath, content, 'utf-8')
          committedFiles.push(filePath)
          results.filesCommitted++
          results.editsApplied += this.stagedEdits.get(filePath).length
        } catch (error) {
          results.success = false
          results.errors.push({ filePath, error: error.message })
          this.commitErrors.push({ filePath, error: error.message })

          // Rollback all committed files
          await this.rollback(committedFiles)
          return {
            success: false,
            error: `Failed to write ${filePath}: ${error.message}`,
            rollbackPerformed: true,
            errors: results.errors,
          }
        }
      }

      this.state = TransactionState.COMMITTED

      return results
    } catch (error) {
      this.state = TransactionState.FAILED

      // Attempt rollback
      if (committedFiles.length > 0) {
        await this.rollback(committedFiles)
      }

      return {
        success: false,
        error: error.message,
        rollbackPerformed: committedFiles.length > 0,
      }
    }
  }

  /**
   * Rollback committed changes using backups
   * @param {Array<string>} files - Files to rollback (optional, defaults to all)
   * @returns {Promise<Object>} Rollback result
   */
  async rollback(files = null) {
    this.state = TransactionState.ROLLING_BACK
    this.rollbackErrors = []

    const filesToRollback = files || Array.from(this.originalContents.keys())
    const results = {
      success: true,
      filesRolledBack: 0,
      errors: [],
    }

    for (const filePath of filesToRollback) {
      try {
        // Try backup first
        const backupPath = this.backups.get(filePath)
        if (backupPath) {
          try {
            await fs.copyFile(backupPath, filePath)
            results.filesRolledBack++
            continue
          } catch (e) {
            // Fall through to use original content
          }
        }

        // Use stored original content
        const original = this.originalContents.get(filePath)
        if (original !== undefined) {
          await fs.writeFile(filePath, original, 'utf-8')
          results.filesRolledBack++
        }
      } catch (error) {
        results.success = false
        results.errors.push({ filePath, error: error.message })
        this.rollbackErrors.push({ filePath, error: error.message })
      }
    }

    this.state = results.success ? TransactionState.ROLLED_BACK : TransactionState.FAILED

    return results
  }

  /**
   * Abort the transaction without committing
   * @returns {FileTransaction} this
   */
  abort() {
    if (this.state === TransactionState.COMMITTED) {
      throw new Error('Cannot abort committed transaction')
    }

    this.state = TransactionState.ABORTED
    this.clear()

    return this
  }

  /**
   * Clean up backup files
   * @returns {Promise<number>} Number of backups deleted
   */
  async cleanupBackups() {
    let deleted = 0

    for (const backupPath of this.backups.values()) {
      try {
        await fs.unlink(backupPath)
        deleted++
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    this.backups.clear()
    return deleted
  }

  /**
   * Assert transaction is in expected state
   * @param {...string} allowedStates - Allowed states
   */
  assertState(...allowedStates) {
    if (!allowedStates.includes(this.state)) {
      throw new Error(
        `Invalid transaction state: ${this.state}. ` + `Expected: ${allowedStates.join(' or ')}`,
      )
    }
  }

  /**
   * Get transaction status
   * @returns {Object} Status info
   */
  getStatus() {
    return {
      id: this.id,
      state: this.state,
      stagedFiles: this.getStagedFiles().length,
      stagedEdits: this.getStagedCount(),
      validationErrors: this.validationErrors.length,
      commitErrors: this.commitErrors.length,
      rollbackErrors: this.rollbackErrors.length,
      backupsCreated: this.backups.size,
      createdAt: this.createdAt,
      age: Date.now() - this.createdAt,
    }
  }

  /**
   * Serialize transaction state for persistence
   * @returns {Object} Serializable state
   */
  toJSON() {
    return {
      id: this.id,
      state: this.state,
      createdAt: this.createdAt,
      baseDir: this.baseDir,
      stagedEdits: Array.from(this.stagedEdits.entries()),
      validationErrors: this.validationErrors,
      commitErrors: this.commitErrors,
      rollbackErrors: this.rollbackErrors,
      backups: Array.from(this.backups.entries()),
    }
  }

  /**
   * Restore transaction from serialized state
   * @param {Object} json - Serialized state
   * @returns {FileTransaction} Restored transaction
   */
  static fromJSON(json) {
    const tx = new FileTransaction({ baseDir: json.baseDir })
    tx.id = json.id
    tx.state = json.state
    tx.createdAt = json.createdAt
    tx.stagedEdits = new Map(json.stagedEdits)
    tx.validationErrors = json.validationErrors
    tx.commitErrors = json.commitErrors
    tx.rollbackErrors = json.rollbackErrors
    tx.backups = new Map(json.backups)
    return tx
  }
}

// ============================================================================
// TRANSACTION MANAGER
// ============================================================================

/**
 * TransactionManager
 *
 * Manages multiple file transactions with history.
 */
class TransactionManager {
  constructor(options = {}) {
    this.transactions = new Map()
    this.history = []
    this.maxHistory = options.maxHistory || 100
    this.baseDir = options.baseDir || process.cwd()
  }

  /**
   * Create a new transaction
   * @param {Object} options - Transaction options
   * @returns {FileTransaction} New transaction
   */
  create(options = {}) {
    const tx = new FileTransaction({
      baseDir: this.baseDir,
      ...options,
    })

    this.transactions.set(tx.id, tx)

    return tx
  }

  /**
   * Get a transaction by ID
   * @param {string} id - Transaction ID
   * @returns {FileTransaction|null}
   */
  get(id) {
    return this.transactions.get(id) || null
  }

  /**
   * List all transactions
   * @param {Object} filter - Optional filter
   * @returns {Array<FileTransaction>}
   */
  list(filter = {}) {
    let transactions = Array.from(this.transactions.values())

    if (filter.state) {
      transactions = transactions.filter((tx) => tx.state === filter.state)
    }

    return transactions
  }

  /**
   * Remove a transaction from the manager
   * @param {string} id - Transaction ID
   */
  remove(id) {
    const tx = this.transactions.get(id)
    if (tx) {
      // Archive to history
      this.history.push({
        id: tx.id,
        state: tx.state,
        createdAt: tx.createdAt,
        removedAt: Date.now(),
      })

      // Trim history
      while (this.history.length > this.maxHistory) {
        this.history.shift()
      }

      this.transactions.delete(id)
    }
  }

  /**
   * Execute a batch of edits atomically
   * @param {Array} edits - Array of {filePath, searchBlock, replaceBlock}
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Result
   */
  async execute(edits, options = {}) {
    const tx = this.create(options)

    try {
      // Stage all edits
      tx.stageAll(edits)

      // Validate
      const validation = await tx.validate()
      if (!validation.valid) {
        this.remove(tx.id)
        return {
          success: false,
          transactionId: tx.id,
          error: 'Validation failed',
          errors: validation.errors,
        }
      }

      // Commit
      const result = await tx.commit()

      // Cleanup backups on success if requested
      if (result.success && options.cleanupBackups) {
        await tx.cleanupBackups()
      }

      return {
        ...result,
        transactionId: tx.id,
      }
    } catch (error) {
      return {
        success: false,
        transactionId: tx.id,
        error: error.message,
      }
    }
  }

  /**
   * Get manager status
   * @returns {Object} Status info
   */
  getStatus() {
    const states = {}
    for (const tx of this.transactions.values()) {
      states[tx.state] = (states[tx.state] || 0) + 1
    }

    return {
      activeTransactions: this.transactions.size,
      historySize: this.history.length,
      stateBreakdown: states,
    }
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Execute multiple file edits atomically
 * @param {Array} edits - Array of {filePath, searchBlock, replaceBlock}
 * @param {Object} options - Options
 * @returns {Promise<Object>} Result
 */
async function executeAtomic(edits, options = {}) {
  const tx = new FileTransaction(options)
  tx.stageAll(edits)

  const validation = await tx.validate()
  if (!validation.valid) {
    return {
      success: false,
      error: 'Validation failed',
      errors: validation.errors,
    }
  }

  return tx.commit()
}

/**
 * Validate multiple file edits without applying
 * @param {Array} edits - Array of {filePath, searchBlock, replaceBlock}
 * @param {Object} options - Options
 * @returns {Promise<Object>} Validation result
 */
async function validateEdits(edits, options = {}) {
  const tx = new FileTransaction(options)
  tx.stageAll(edits)
  return tx.validate()
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // States
  TransactionState,

  // Classes
  FileTransaction,
  TransactionManager,

  // Functions
  executeAtomic,
  validateEdits,
}
