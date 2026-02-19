/**
 * Centralized logging system for Lumiere
 * Provides structured logging with configurable log levels
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

interface LoggerConfig {
  minLevel: LogLevel
  enableTimestamps: boolean
  enableColors: boolean
}

class Logger {
  private config: LoggerConfig
  private namespace?: string

  constructor(config?: Partial<LoggerConfig>, namespace?: string) {
    this.config = {
      minLevel: __DEV__ ? LogLevel.DEBUG : LogLevel.INFO,
      enableTimestamps: __DEV__,
      enableColors: true,
      ...config,
    }
    this.namespace = namespace
  }

  /**
   * Create a namespaced logger instance
   */
  create(namespace: string): Logger {
    return new Logger(this.config, namespace)
  }

  /**
   * Configure the logger
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Set minimum log level
   */
  setLevel(level: LogLevel): void {
    this.config.minLevel = level
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.minLevel
  }

  private formatMessage(level: string, message: string): string {
    const parts: string[] = []

    if (this.config.enableTimestamps) {
      const timestamp = new Date().toISOString()
      parts.push(`[${timestamp}]`)
    }

    parts.push(`[${level}]`)

    if (this.namespace) {
      parts.push(`[${this.namespace}]`)
    }

    parts.push(message)

    return parts.join(' ')
  }

  /**
   * Log debug message
   */
  debug(message: string, ...args: unknown[]): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return

    const formatted = this.formatMessage('DEBUG', message)
    console.log(formatted, ...args)
  }

  /**
   * Log info message
   */
  info(message: string, ...args: unknown[]): void {
    if (!this.shouldLog(LogLevel.INFO)) return

    const formatted = this.formatMessage('INFO', message)
    console.log(formatted, ...args)
  }

  /**
   * Log warning message
   */
  warn(message: string, ...args: unknown[]): void {
    if (!this.shouldLog(LogLevel.WARN)) return

    const formatted = this.formatMessage('WARN', message)
    console.warn(formatted, ...args)
  }

  /**
   * Log error message
   */
  error(message: string, ...args: unknown[]): void {
    if (!this.shouldLog(LogLevel.ERROR)) return

    const formatted = this.formatMessage('ERROR', message)
    console.error(formatted, ...args)
  }

  /**
   * Log an error object
   */
  logError(message: string, error: Error | unknown, ...args: unknown[]): void {
    if (!this.shouldLog(LogLevel.ERROR)) return

    const formatted = this.formatMessage('ERROR', message)

    if (error instanceof Error) {
      console.error(formatted, error.message, ...args)
      if (__DEV__ && error.stack) {
        console.error(error.stack)
      }
    } else {
      console.error(formatted, error, ...args)
    }
  }
}

// Export singleton instance
export const logger = new Logger()

// Export default for convenience
export default logger
