/**
 * ANSI color codes for terminal output
 */
export const Colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
} as const

export type ColorKey = keyof typeof Colors

/**
 * Logger interface for type safety
 */
export interface Logger {
  log: (msg?: string) => void
  info: (msg: string) => void
  success: (msg: string) => void
  warn: (msg: string) => void
  error: (msg: string) => void
  header: (msg: string) => void
  json: (data: unknown) => void
  table: (rows: Array<[string, string]>) => void
}

/**
 * Check if running in JSON output mode
 */
let jsonMode = false

export function setJsonMode(enabled: boolean): void {
  jsonMode = enabled
}

export function isJsonMode(): boolean {
  return jsonMode
}

/**
 * Colorize text with ANSI codes
 */
export function colorize(text: string, ...colors: ColorKey[]): string {
  if (jsonMode) return text
  const codes = colors.map((c) => Colors[c]).join('')
  return `${codes}${text}${Colors.reset}`
}

/**
 * Standard log output
 */
export function log(msg = ''): void {
  if (!jsonMode) {
    console.log(msg)
  }
}

/**
 * Info message with cyan icon
 */
export function info(msg: string): void {
  if (!jsonMode) {
    console.log(`${Colors.cyan}i${Colors.reset} ${msg}`)
  }
}

/**
 * Success message with green checkmark
 */
export function success(msg: string): void {
  if (!jsonMode) {
    console.log(`${Colors.green}[OK]${Colors.reset} ${msg}`)
  }
}

/**
 * Warning message with yellow icon
 */
export function warn(msg: string): void {
  if (!jsonMode) {
    console.log(`${Colors.yellow}[WARN]${Colors.reset} ${msg}`)
  }
}

/**
 * Error message with red icon
 */
export function error(msg: string): void {
  console.error(`${Colors.red}[ERROR]${Colors.reset} ${msg}`)
}

/**
 * Header with decorative formatting
 */
export function header(msg: string): void {
  if (!jsonMode) {
    log()
    log(`${Colors.bold}${Colors.magenta}[MAMO] ${msg}${Colors.reset}`)
    log('='.repeat(50))
  }
}

/**
 * Output JSON data (works in both modes)
 */
export function json(data: unknown): void {
  console.log(JSON.stringify(data, null, 2))
}

/**
 * Output a simple table
 */
export function table(rows: Array<[string, string]>): void {
  if (jsonMode) return

  const maxKeyLength = Math.max(...rows.map(([key]) => key.length))
  for (const [key, value] of rows) {
    log(`   ${key.padEnd(maxKeyLength + 2)} ${value}`)
  }
}

/**
 * Output transaction info
 */
export function txInfo(hash: string, label = 'Tx'): void {
  info(`${label}: ${hash}`)
  info('Waiting for confirmation...')
}

/**
 * Output BaseScan link
 */
export function baseScanLink(hash: string): void {
  log(`BaseScan:  https://basescan.org/tx/${hash}`)
}

/**
 * Create a divider line
 */
export function divider(char = '-', length = 40): void {
  if (!jsonMode) {
    log(char.repeat(length))
  }
}

/**
 * Create the logger instance
 */
export const logger: Logger = {
  log,
  info,
  success,
  warn,
  error,
  header,
  json,
  table,
}

export default logger
