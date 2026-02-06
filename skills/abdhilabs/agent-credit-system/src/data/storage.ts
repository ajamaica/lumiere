/**
 * Simple JSON file storage wrapper for the Agent Credit System
 * Provides synchronous read/write operations for JSON data files
 */

import * as fs from 'fs'
import * as path from 'path'

/**
 * Storage configuration options
 */
export interface StorageConfig {
  /** Directory path for data files */
  dataDir: string
}

/**
 * Default storage configuration
 */
const DEFAULT_CONFIG: StorageConfig = {
  dataDir: path.join(process.cwd(), 'data'),
}

/**
 * Simple JSON file storage wrapper class
 * Handles reading and writing JSON data to files synchronously
 */
export class Storage {
  private config: StorageConfig
  private initialized: boolean = false

  /**
 a new Storage instance
   * @param config - Optional storage configuration
   */
  constructor(config?: Partial<StorageConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Ensures the data directory exists
   * @throws Error if directory cannot be created
   */
  private ensureDirectory(): void {
    if (!fs.existsSync(this.config.dataDir)) {
      fs.mkdirSync(this.config.dataDir, { recursive: true })
    }
  }

  /**
   * Initializes the storage system
   * Creates the data directory if it doesn't exist
   */
  init(): void {
    if (!this.initialized) {
      this.ensureDirectory()
      this.initialized = true
    }
  }

  /**
   * Reads data from a JSON file
   * @param filename - Name of the file to read (without extension)
   * @param defaultValue - Default value if file doesn't exist
   * @returns Parsed JSON data or default value
   */
  read<T>(filename: string, defaultValue: T): T {
    const filePath = path.join(this.config.dataDir, `${filename}.json`)

    if (!fs.existsSync(filePath)) {
      return defaultValue
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(content, reviver) as T
    } catch (error) {
      console.error(`Error reading ${filename}.json:`, error)
      return defaultValue
    }
  }

  /**
   * Writes data to a JSON file
   * @param filename - Name of the file to write (without extension)
   * @param data - Data to write
   * @returns true if write was successful
   */
  write<T>(filename: string, data: T): boolean {
    const filePath = path.join(this.config.dataDir, `${filename}.json`)

    try {
      this.ensureDirectory()
      const content = JSON.stringify(data, null, 2)
      fs.writeFileSync(filePath, content, 'utf-8')
      return true
    } catch (error) {
      console.error(`Error writing ${filename}.json:`, error)
      return false
    }
  }

  /**
   * Checks if a file exists
   * @param filename - Name of the file to check (without extension)
   * @returns true if file exists
   */
  exists(filename: string): boolean {
    const filePath = path.join(this.config.dataDir, `${filename}.json`)
    return fs.existsSync(filePath)
  }

  /**
   * Deletes a JSON file
   * @param filename - Name of the file to delete (without extension)
   * @returns true if deletion was successful
   */
  delete(filename: string): boolean {
    const filePath = path.join(this.config.dataDir, `${filename}.json`)

    if (!fs.existsSync(filePath)) {
      return false
    }

    try {
      fs.unlinkSync(filePath)
      return true
    } catch (error) {
      console.error(`Error deleting ${filename}.json:`, error)
      return false
    }
  }

  /**
   * Gets the file path for a given filename
   * @param filename - Name of the file (without extension)
   * @returns Full path to the file
   */
  getPath(filename: string): string {
    return path.join(this.config.dataDir, `${filename}.json`)
  }
}

/**
 * JSON reviver function for parsing dates
 * @param key - The key being parsed
 * @param value - The value being parsed
 * @returns Parsed value (converts ISO date strings to Date objects)
 */
function reviver(key: string, value: unknown): unknown {
  // Convert ISO date strings to Date objects
  if (typeof value === 'string') {
    const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/
    if (dateRegex.test(value)) {
      return new Date(value)
    }
  }
  return value
}

/**
 * Singleton storage instance for convenience
 */
export const storage = new Storage()

// Default data factory functions
export const defaultAgentsData = (): AgentRegistryData => ({ agents: [] })
export const defaultLoansData = (): LoanLedgerData => ({ loans: [] })
export const defaultConfigData = (): SystemConfigData => ({
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  lastUpdated: new Date().toISOString(),
  systemStatus: 'active',
})

/**
 * Agent registry storage data structure
 */
export interface AgentRegistryData {
  agents: AgentRecord[]
}

/**
 * Individual agent record for storage
 */
export interface AgentRecord {
  id: string
  moltbookName: string
  creditScore: number
  creditLimit: number
  status: AgentStatus
  registeredAt: string
  lastActivity: string
  outstandingLoan?: number
  defaultCount?: number
  walletAddress?: string
  walletId?: string
}

/**
 * Agent status enum
 */
export enum AgentStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BLACKLISTED = 'blacklisted',
}

/**
 * Loan ledger storage data structure
 */
export interface LoanLedgerData {
  loans: LoanRecord[]
}

/**
 * Individual loan record for storage
 */
export interface LoanRecord {
  id: string
  agentId: string
  agentName: string
  amount: number
  status: LoanRecordStatus
  dueDate: string
  createdAt: string
  repaidAt?: string
  interestRate?: number
}

/**
 * Loan record status enum
 */
export enum LoanRecordStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  REPAID = 'repaid',
  DEFAULTED = 'defaulted',
  OVERDUE = 'overdue',
}

/**
 * System configuration storage data structure
 */
export interface SystemConfigData {
  version: string
  createdAt: string
  lastUpdated: string
  systemStatus: 'active' | 'maintenance' | 'paused'
}
