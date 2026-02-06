/**
 * Output Formatting Utilities
 * AI-agent optimized output formats
 */

import type { OutputFormat } from '../types/index.js'

/**
 * Format data for output
 */
export function formatOutput(data: unknown, format: OutputFormat = 'json'): string {
  switch (format) {
    case 'json':
      return JSON.stringify(data, null, 2)

    case 'minimal':
      return formatMinimal(data)

    case 'table':
      return formatTable(data)

    default:
      return JSON.stringify(data, null, 2)
  }
}

/**
 * Format as minimal output (key=value or single values)
 */
function formatMinimal(data: unknown): string {
  if (data === null || data === undefined) {
    return ''
  }

  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    return String(data)
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return ''

    // For arrays of objects, output key fields
    if (typeof data[0] === 'object' && data[0] !== null) {
      return data
        .map((item) => {
          const obj = item as Record<string, unknown>
          // Try to find a primary identifier
          const id = obj.id || obj.address || obj.name || obj.symbol || Object.values(obj)[0]
          return String(id)
        })
        .join('\n')
    }

    return data.map(String).join('\n')
  }

  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>
    return Object.entries(obj)
      .filter(([_, v]) => v !== null && v !== undefined)
      .map(([k, v]) => {
        if (typeof v === 'object') {
          return `${k}=${JSON.stringify(v)}`
        }
        return `${k}=${v}`
      })
      .join('\n')
  }

  return String(data)
}

/**
 * Format as ASCII table
 */
function formatTable(data: unknown): string {
  if (!Array.isArray(data) || data.length === 0) {
    return formatMinimal(data)
  }

  // Get all keys from first object
  const firstItem = data[0]
  if (typeof firstItem !== 'object' || firstItem === null) {
    return data.map(String).join('\n')
  }

  const keys = Object.keys(firstItem)
  const rows: string[][] = []

  // Add header
  rows.push(keys)

  // Add data rows
  for (const item of data) {
    const obj = item as Record<string, unknown>
    const row = keys.map((key) => {
      const value = obj[key]
      if (value === null || value === undefined) return ''
      if (typeof value === 'object') return JSON.stringify(value)
      return String(value)
    })
    rows.push(row)
  }

  // Calculate column widths
  const widths = keys.map((_, i) => Math.max(...rows.map((row) => row[i]?.length || 0)))

  // Build table
  const lines: string[] = []
  const separator = widths.map((w) => '-'.repeat(w)).join('-+-')

  // Header
  lines.push(rows[0].map((cell, i) => cell.padEnd(widths[i])).join(' | '))
  lines.push(separator)

  // Data rows
  for (let i = 1; i < rows.length; i++) {
    lines.push(rows[i].map((cell, j) => cell.padEnd(widths[j])).join(' | '))
  }

  return lines.join('\n')
}

/**
 * Format a number as percentage
 */
export function formatPercent(value: number | undefined, decimals = 2): string {
  if (value === undefined || value === null) return '-'
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * Format a number with thousands separator
 */
export function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Format USD value
 */
export function formatUsd(value: number | undefined): string {
  if (value === undefined || value === null) return '-'
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`
  }
  return `$${value.toFixed(2)}`
}

/**
 * Format token amount
 */
export function formatTokenAmount(amount: number, decimals = 6): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(2)}M`
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(2)}K`
  }
  return amount.toFixed(decimals)
}

/**
 * Format Solana signature for display
 */
export function formatSignature(signature: string): string {
  return `${signature.slice(0, 8)}...${signature.slice(-8)}`
}

/**
 * Format Solana address for display
 */
export function formatAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

/**
 * Print success message
 */
export function success(message: string): void {
  console.log(`✅ ${message}`)
}

/**
 * Print error message
 */
export function error(message: string): void {
  console.error(`❌ ${message}`)
}

/**
 * Print info message
 */
export function info(message: string): void {
  console.log(`ℹ️  ${message}`)
}

/**
 * Print warning message
 */
export function warn(message: string): void {
  console.warn(`⚠️  ${message}`)
}

export default formatOutput
