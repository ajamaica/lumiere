#!/usr/bin/env node
/**
 * OpenClaw Memory Tool Replacement
 * Drop-in replacement for built-in memory_search using vector embeddings
 *
 * This script provides the same interface as OpenClaw's memory_search
 * but uses 100% local vector embeddings instead of string similarity.
 */

import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const WORKSPACE = '/config/.openclaw/workspace'

/**
 * Search memory using vector embeddings
 * Compatible with OpenClaw's memory_search output format
 */
export async function memorySearch(query, maxResults = 5) {
  try {
    const result = execSync(
      `node vector-memory/vector_memory_local.js --search ${JSON.stringify(query)} --max-results ${maxResults}`,
      {
        cwd: WORKSPACE,
        encoding: 'utf-8',
        timeout: 30000, // 30 second timeout for model loading
      },
    )

    const parsed = JSON.parse(result)

    // Convert to OpenClaw-compatible format
    return parsed.results.map((r) => ({
      path: r.path,
      lines: `${r.from}-${r.from + r.lines - 1}`,
      score: r.score,
      snippet: r.snippet,
    }))
  } catch (error) {
    console.error('Vector memory search failed:', error.message)
    // Return empty array on failure (graceful degradation)
    return []
  }
}

/**
 * Get full content from a memory file
 * Compatible with OpenClaw's memory_get
 */
export function memoryGet(filePath, from, lines) {
  try {
    const fs = require('fs')
    const path = require('path')
    const fullPath = path.join(WORKSPACE, filePath)

    if (!fs.existsSync(fullPath)) {
      return null
    }

    const content = fs.readFileSync(fullPath, 'utf-8')
    const allLines = content.split('\n')
    const slice = allLines.slice(from - 1, from - 1 + lines)

    return {
      path: filePath,
      from,
      content: slice.join('\n'),
    }
  } catch (error) {
    console.error('Memory get failed:', error.message)
    return null
  }
}

/**
 * Sync memory files to vector index
 */
export function memorySync() {
  try {
    execSync('node vector-memory/vector_memory_local.js --sync', {
      cwd: WORKSPACE,
      stdio: 'inherit',
    })
    return true
  } catch (error) {
    console.error('Memory sync failed:', error.message)
    return false
  }
}

/**
 * Check memory status
 */
export function memoryStatus() {
  try {
    const result = execSync('node vector-memory/vector_memory_local.js --status', {
      cwd: WORKSPACE,
      encoding: 'utf-8',
    })
    return JSON.parse(result)
  } catch (error) {
    return { status: 'error', error: error.message }
  }
}

// CLI interface for direct usage
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  const command = args[0]

  if (command === '--search') {
    const query = args[1]
    const maxResults = parseInt(args.find((a, i) => args[i - 1] === '--max-results') || '5')
    const results = await memorySearch(query, maxResults)
    console.log(JSON.stringify(results, null, 2))
  } else if (command === '--get') {
    const filePath = args[1]
    const from = parseInt(args[2])
    const lines = parseInt(args[3])
    const result = memoryGet(filePath, from, lines)
    console.log(JSON.stringify(result, null, 2))
  } else if (command === '--sync') {
    memorySync()
  } else if (command === '--status') {
    const status = memoryStatus()
    console.log(JSON.stringify(status, null, 2))
  } else {
    console.log(`
OpenClaw Vector Memory Integration

Usage:
  --search "query" [--max-results 5]
  --get <file-path> <from-line> <line-count>
  --sync
  --status

Examples:
  node memory.js --search "James values"
  node memory.js --get MEMORY.md 1 20
  node memory.js --sync
`)
  }
}
