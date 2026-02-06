#!/usr/bin/env node
/**
 * Smart Memory Search Wrapper
 * Automatically uses vector search when available, falls back to built-in
 *
 * This is the default memory_search tool when the vector-memory skill is installed.
 * No configuration needed - works out of the box.
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const WORKSPACE = process.env.OPENCLAW_WORKSPACE || '/config/.openclaw/workspace'

/**
 * Check if vector memory is ready to use
 */
function isVectorMemoryReady() {
  const vectorDbPath = path.join(WORKSPACE, 'vector-memory', 'vectors_local.json')

  if (!fs.existsSync(vectorDbPath)) {
    return false
  }

  try {
    const db = JSON.parse(fs.readFileSync(vectorDbPath, 'utf-8'))
    return db.chunks && db.chunks.length > 0
  } catch {
    return false
  }
}

/**
 * Built-in memory search (fallback)
 * Simple keyword-based search through memory files
 */
function builtInMemorySearch(query, maxResults = 5) {
  const results = []
  const queryLower = query.toLowerCase()
  const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2)

  // Search MEMORY.md and memory/ directory
  const filesToSearch = [
    path.join(WORKSPACE, 'MEMORY.md'),
    ...fs
      .readdirSync(path.join(WORKSPACE, 'memory'))
      .filter((f) => f.endsWith('.md'))
      .map((f) => path.join(WORKSPACE, 'memory', f)),
  ].filter((f) => fs.existsSync(f))

  for (const filePath of filesToSearch) {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')

    // Score each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase()
      let score = 0

      // Check for query words
      for (const word of queryWords) {
        if (line.includes(word)) {
          score += 1
        }
      }

      if (score > 0) {
        const relativePath = path.relative(WORKSPACE, filePath)
        // Get context (5 lines before/after)
        const start = Math.max(0, i - 2)
        const end = Math.min(lines.length, i + 3)
        const snippet = lines.slice(start, end).join('\n')

        results.push({
          path: relativePath,
          lines: `${i + 1}-${i + 1}`,
          score: score / queryWords.length,
          snippet: snippet.slice(0, 300),
        })
      }
    }
  }

  // Sort by score and return top results
  return results.sort((a, b) => b.score - a.score).slice(0, maxResults)
}

/**
 * Vector memory search (preferred)
 */
async function vectorMemorySearch(query, maxResults = 5) {
  try {
    const result = execSync(
      `node vector-memory/vector_memory_local.js --search ${JSON.stringify(query)} --max-results ${maxResults}`,
      {
        cwd: WORKSPACE,
        encoding: 'utf-8',
        timeout: 30000,
      },
    )

    const parsed = JSON.parse(result)

    // Convert to standard format
    return parsed.results.map((r) => ({
      path: r.path,
      lines: `${r.from}-${r.from + r.lines - 1}`,
      score: r.score,
      snippet: r.snippet,
    }))
  } catch (error) {
    throw new Error(`Vector search failed: ${error.message}`)
  }
}

/**
 * Smart memory search - auto-selects best method
 */
export async function memorySearch(query, maxResults = 5) {
  // Try vector search first if available
  if (isVectorMemoryReady()) {
    try {
      const results = await vectorMemorySearch(query, maxResults)
      if (results.length > 0) {
        // Add metadata to indicate vector was used
        results._method = 'vector'
        return results
      }
    } catch (err) {
      // Vector failed, fall through to built-in
      console.error(`Vector search error (falling back): ${err.message}`)
    }
  }

  // Fall back to built-in search
  const results = builtInMemorySearch(query, maxResults)
  results._method = 'builtin'
  return results
}

/**
 * Get full content from memory file
 */
export function memoryGet(filePath, from, lines) {
  try {
    const fullPath = path.join(WORKSPACE, filePath)

    if (!fs.existsSync(fullPath)) {
      return null
    }

    const content = fs.readFileSync(fullPath, 'utf-8')
    const allLines = content.split('\n')
    const lineCount = parseInt(lines) || 50
    const startLine = parseInt(from) || 1
    const slice = allLines.slice(startLine - 1, startLine - 1 + lineCount)

    return {
      path: filePath,
      from: startLine,
      content: slice.join('\n'),
    }
  } catch (error) {
    console.error(`Memory get error: ${error.message}`)
    return null
  }
}

/**
 * Sync memory files
 */
export async function memorySync() {
  try {
    execSync('node vector-memory/vector_memory_local.js --sync', {
      cwd: WORKSPACE,
      stdio: 'inherit',
    })
    return true
  } catch (error) {
    console.error(`Memory sync error: ${error.message}`)
    return false
  }
}

/**
 * Check memory system status
 */
export function memoryStatus() {
  const vectorReady = isVectorMemoryReady()
  const vectorDbPath = path.join(WORKSPACE, 'vector-memory', 'vectors_local.json')
  let chunks = 0
  let lastSync = null

  if (vectorReady) {
    try {
      const db = JSON.parse(fs.readFileSync(vectorDbPath, 'utf-8'))
      chunks = db.chunks?.length || 0
      lastSync = db.lastSync
    } catch {}
  }

  return {
    vectorReady,
    chunks,
    lastSync,
    workspace: WORKSPACE,
  }
}

// CLI interface
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  const command = args[0]

  if (command === '--search') {
    const query = args[1]
    const maxResults = parseInt(args.find((a, i) => args[i - 1] === '--max-results') || '5')

    if (!query) {
      console.error('Usage: --search "query" [--max-results N]')
      process.exit(1)
    }

    const results = await memorySearch(query, maxResults)
    console.log(JSON.stringify(results, null, 2))
  } else if (command === '--get') {
    const filePath = args[1]
    const from = parseInt(args[2])
    const lines = parseInt(args[3])
    const result = memoryGet(filePath, from, lines)
    console.log(JSON.stringify(result, null, 2))
  } else if (command === '--sync') {
    await memorySync()
  } else if (command === '--status') {
    const status = memoryStatus()
    console.log(JSON.stringify(status, null, 2))
  } else if (command === '--test') {
    // Quick test
    console.log('Testing smart memory search...\n')

    const status = memoryStatus()
    console.log(`Vector ready: ${status.vectorReady}`)
    console.log(`Chunks indexed: ${status.chunks}`)
    console.log(`Last sync: ${status.lastSync || 'never'}`)
    console.log('')

    if (status.vectorReady) {
      console.log('Running vector search test...')
      const results = await memorySearch('James values', 2)
      console.log(`Method used: ${results._method}`)
      console.log(`Results: ${results.length}`)
      if (results.length > 0) {
        console.log(`Top match: ${results[0].path} (score: ${results[0].score})`)
      }
    } else {
      console.log('Vector not ready, testing built-in fallback...')
      const results = await memorySearch('James', 2)
      console.log(`Method used: ${results._method}`)
      console.log(`Results: ${results.length}`)
    }
  } else {
    console.log(`
Smart Memory Search (Vector + Fallback)

Usage:
  --search "query" [--max-results 5]    Search memory (auto-selects best method)
  --get <path> <from> <lines>           Get full content from file
  --sync                                Sync memory files to vector index
  --status                              Check memory system status
  --test                                Run quick test

Behavior:
  1. If vector index exists → use semantic search (best quality)
  2. If vector not ready → use built-in keyword search (fallback)
  3. If vector fails → automatically fall back to built-in

Zero configuration required. Install skill and it just works.
`)
  }
}
